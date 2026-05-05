# frozen_string_literal: true

RSpec.describe(EnrichNewsJob) do
  let(:mock_analysis) { double(summary: "A concise summary.", sentiment: "positive") }
  let(:mock_response) do
    double(output: [double(content: [double(parsed: mock_analysis)])])
  end
  let(:mock_client) { double(responses: double(create: mock_response)) }

  before do
    allow(OpenAI::Client).to(receive(:new).and_return(mock_client))
  end

  describe "#perform" do
    let(:news) { create(:news, summary: nil) }

    it "fetches the news, calls the API once, and persists summary and sentiment" do
      described_class.perform_now(news.id.to_s)
      news.reload

      expect(mock_client.responses).to(have_received(:create).once)
      expect(news.summary).to(eq("A concise summary."))
      expect(news.sentiment).to(eq("positive"))
    end
  end

  describe "#summarise" do
    let(:news) { build(:news) }

    it "returns [summary, sentiment] from the API response" do
      summary, sentiment = described_class.new.summarise(news)

      expect(summary).to(eq("A concise summary."))
      expect(sentiment).to(eq("positive"))
    end

    it "passes the article content to the API" do
      described_class.new.summarise(news)

      expect(mock_client.responses).to(have_received(:create).with(
        hash_including(
          model: "gpt-4o-mini",
          input: include(hash_including(role: :user, content: news.content)),
          text: EnrichNewsJob::NewsAnalysis,
        ),
      ))
    end
  end
end
