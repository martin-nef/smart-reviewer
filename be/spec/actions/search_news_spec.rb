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

    it "creates News records associated with the given search" do
      expect { action.persist_articles(articles) }.to(change(News, :count).by(10))
    end

    it "associates all News records with the search" do
      news_list = action.persist_articles(articles)
      expect(news_list.map(&:search_id).uniq).to(eq([search.id]))
    end
  end

  describe "#call" do
    let(:ok_response) { double(code: "200", body: fixture_json, message: "OK") }

    it "returns cached news without hitting the API when the search already has news" do
      existing = create_list(:news, 2, search: search)
      expect(Net::HTTP).not_to(receive(:get_response))

      expect(action.call.to_a).to(match_array(existing))
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
