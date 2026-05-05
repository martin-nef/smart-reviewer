# frozen_string_literal: true

RSpec.describe(Actions::SearchNews) do
  let(:search) { create(:search, query: "ruby", page: 1) }

  subject(:action) { described_class.new(search, 1) }

  let(:fixture_json) { File.read(Rails.root.join("spec/fixtures/gnews_get_search.json")) }

  describe "#query_url" do
    it "returns a URI with the query and page encoded" do
      url = action.query_url

      expect(url).to(be_a(URI::Generic))
      expect(url.to_s).to(include("q=ruby"))
      expect(url.to_s).to(include("page=1"))
    end

    it "clamps page to 1 when given zero" do
      url = described_class.new(search, 0).query_url
      expect(url.to_s).to(include("page=1"))
    end

    it "clamps page to 1 when given a negative number" do
      url = described_class.new(search, -5).query_url
      expect(url.to_s).to(include("page=1"))
    end
  end

  describe "#parse_articles" do
    it "extracts the articles array from the response string" do
      articles = action.parse_articles(fixture_json)

      expect(articles).to(be_an(Array))
      expect(articles.length).to(eq(10))
      expect(articles.first).to(include("title", "url", "content"))
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
    it "fetches articles from GNews and persists them under the search" do
      allow(Net::HTTP).to(receive(:get).and_return(fixture_json))

      expect { action.call }.to(change(News, :count).by(10))
    end
  end
end
