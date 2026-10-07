# frozen_string_literal: true

RSpec.describe(Actions::SearchNews) do
  let(:search) { create(:search, query: "ruby", page: 1) }

  subject(:action) { described_class.new(search) }

  let(:fixture_json) { File.read(Rails.root.join("spec/fixtures/gnews_get_search.json")) }

  describe "#query_url" do
    subject(:url) { action.query_url }

    let(:params) { URI.decode_www_form(url.query).to_h }

    it "returns a valid HTTPS URI with no spaces" do
      expect(url).to(be_a(URI::HTTPS))
      expect(url.to_s).not_to(include(" "))
    end

    it "sets q to the search query" do
      expect(params["q"]).to(eq("ruby"))
    end

    it "sets page from the search object" do
      expect(params["page"]).to(eq("1"))
    end

    it "sets lang to en" do
      expect(params["lang"]).to(eq("en"))
    end

    it "encodes special characters in the query" do
      search_with_spaces = create(:search, query: "ruby on rails")
      url = described_class.new(search_with_spaces).query_url
      expect(url.to_s).not_to(include(" "))
      expect(URI.decode_www_form(url.query).to_h["q"]).to(eq("ruby on rails"))
    end
  end

  describe "#parse_articles" do
    it "extracts the articles array from the response string" do
      articles = action.parse_articles(fixture_json)

      expect(articles).to(be_an(Array))
      expect(articles.length).to(eq(10))
      expect(articles.first).to(include("title", "url", "content"))
    end

    it "returns an empty array when the response has no articles key" do
      expect(action.parse_articles('{"errors":["invalid key"]}')).to(eq([]))
    end
  end

  describe "#persist_articles" do
    let(:articles) { JSON.parse(fixture_json)["articles"] }

    it "creates News records and links them to the search" do
      expect { action.persist_articles(articles) }.to(change(News, :count).by(10))
      expect(search.reload.news.count).to(eq(10))
    end

    it "stamps the search as fetched" do
      expect { action.persist_articles(articles) }.to(change { search.reload.fetched_at }.from(nil))
    end

    it "reuses existing News with the same url instead of duplicating" do
      existing = create(:news, url: articles.first["url"], summary: "kept")

      expect { action.persist_articles(articles) }.to(change(News, :count).by(9))
      expect(search.reload.news).to(include(existing))
      expect(existing.reload.summary).to(eq("kept"))
    end

    it "falls back to the existing record when a concurrent insert wins the race" do
      winner = create(:news, url: articles.first["url"])
      error = Mongo::Error::OperationFailure.new("E11000 duplicate key", nil, code: 11_000)
      allow(News).to(receive(:find_or_create_by!).and_wrap_original do |original, attrs, &block|
        attrs[:url] == winner.url ? raise(error) : original.call(attrs, &block)
      end)

      action.persist_articles(articles)

      expect(search.reload.news).to(include(winner))
      expect(News.where(url: winner.url).count).to(eq(1))
    end

    it "re-raises other database errors" do
      allow(News).to(receive(:find_or_create_by!).and_raise(Mongo::Error::OperationFailure.new("boom", nil, code: 1)))

      expect { action.persist_articles(articles) }.to(raise_error(Mongo::Error::OperationFailure))
    end

    it "shares news between searches that return the same articles" do
      other = create(:search, query: "rails")
      action.persist_articles(articles)
      described_class.new(other).persist_articles(articles)

      expect(News.count).to(eq(10))
      expect(other.reload.news.map(&:id)).to(match_array(search.reload.news.map(&:id)))
    end
  end

  describe "#call" do
    let(:ok_response) { double(code: "200", body: fixture_json, message: "OK") }

    it "returns cached news without hitting the API when the search was fetched today" do
      existing = create_list(:news, 2)
      search.update!(news: existing, fetched_at: Time.current)
      expect(Net::HTTP).not_to(receive(:get_response))

      expect(action.call.to_a).to(match_array(existing))
    end

    it "does not hit the API again after a refresh" do
      allow(Net::HTTP).to(receive(:get_response).and_return(ok_response))
      search.update!(fetched_at: 1.day.ago)

      2.times { described_class.new(search.reload).call }

      expect(Net::HTTP).to(have_received(:get_response).once)
    end

    context "when the search was last fetched before today" do
      before do
        search.update!(news: create_list(:news, 2), fetched_at: 1.day.ago)
        allow(Net::HTTP).to(receive(:get_response).and_return(ok_response))
      end

      it "refetches from GNews and updates fetched_at" do
        action.call

        expect(Net::HTTP).to(have_received(:get_response).once)
        expect(search.reload.fetched_at).to(be_today)
      end

      it "replaces the search's news with the fresh results" do
        expect(action.call.count).to(eq(10))
      end

      it "does not duplicate news on repeated refreshes" do
        action.call
        search.update!(fetched_at: 1.day.ago)

        expect { described_class.new(search.reload).call }.not_to(change(News, :count))
      end
    end

    it "does not touch fetched_at when GNews fails" do
      allow(Net::HTTP).to(receive(:get_response).and_return(double(code: "503", message: "x", body: "")))

      expect { action.call }.to(raise_error(Actions::SearchNews::UpstreamError))
      expect(search.reload.fetched_at).to(be_nil)
    end

    it "fetches articles from GNews and persists them under the search" do
      allow(Net::HTTP).to(receive(:get_response).and_return(ok_response))

      expect { action.call }.to(change(News, :count).by(10))
    end

    it "raises RateLimitError on a 429 response" do
      allow(Net::HTTP).to(receive(:get_response).and_return(double(code: "429", message: "Too Many Requests", body: "")))

      expect { action.call }.to(raise_error(Actions::SearchNews::RateLimitError))
    end

    it "raises UpstreamError on a 5xx response" do
      allow(Net::HTTP).to(receive(:get_response).and_return(double(code: "503", message: "Service Unavailable", body: "")))

      expect { action.call }.to(raise_error(Actions::SearchNews::UpstreamError))
    end

    it "raises UpstreamError on a 4xx response other than 429" do
      allow(Net::HTTP).to(receive(:get_response).and_return(double(code: "401", message: "Unauthorized", body: "")))

      expect { action.call }.to(raise_error(Actions::SearchNews::UpstreamError))
    end
  end
end
