# frozen_string_literal: true

RSpec.describe(EnrichNewsJob) do
  describe "#perform" do
    let(:news) { create(:news, summary: nil) }

    it "updates the news record with a summary and sentiment" do
      described_class.perform_now(news.id.to_s)
      news.reload

      expect(news.summary).to(be_a(String))
      expect(news.sentiment).to(be_in(["positive", "negative", "neutral"]))
    end
  end

  describe "#summarise" do
    let(:news) { build(:news) }

    it "returns a two-element array of [summary_string, sentiment_string]" do
      summary, sentiment = described_class.new.summarise(news)

      expect(summary).to(be_a(String))
      expect(sentiment).to(be_in(["positive", "negative", "neutral"]))
    end
  end
end
