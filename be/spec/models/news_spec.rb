# frozen_string_literal: true

RSpec.describe(News) do
  describe "#serialize" do
    subject(:news) { build(:news) }

    it "returns a hash with id, title, url, summary, sentiment, and image_url" do
      expect(news.serialize).to(eq(
        id: news.id,
        title: news.title,
        url: news.url,
        summary: news.summary,
        sentiment: news.sentiment,
        image_url: news.image_url,
      ))
    end
  end

  describe "fields" do
    subject(:news) { build(:news) }

    it "exposes all expected attributes" do
      expect(news.title).to(be_a(String))
      expect(news.url).to(be_a(String))
      expect(news.content).to(be_a(String))
      expect(news.summary).to(be_a(String))
      expect(news.image_url).to(be_a(String))
      expect(news.sentiment).to(be_a(String))
    end
  end

  describe "indexes" do
    it "rejects two news with the same url at the database level" do
      create(:news, url: "https://example.com/dup")

      expect { build(:news, url: "https://example.com/dup").save!(validate: false) }
        .to(raise_error(Mongo::Error::OperationFailure, /E11000/))
    end
  end
end
