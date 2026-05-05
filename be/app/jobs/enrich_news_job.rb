# frozen_string_literal: true

class EnrichNewsJob < ApplicationJob
  queue_as :default

  class NewsAnalysis < OpenAI::BaseModel
    required :summary, String
    required :sentiment, String
  end

  def perform(news_id)
    news = News.find(news_id)
    summary, sentiment = summarise(news)
    news.update!(summary: summary, sentiment: sentiment)
  end

  def summarise(news)
    client = OpenAI::Client.new
    response = client.responses.create(
      model: "gpt-4o-mini",
      input: [
        {
          role: :system,
          content: <<~PROMPT,
            Summarise the given news article in plain text (no markdown, no HTML tags), under 100 words.
            Classify the overall sentiment as exactly one of: positive, negative, neutral.
          PROMPT
        },
        { role: :user, content: news.content },
      ],
      text: NewsAnalysis,
    )

    result = response.output.flat_map(&:content).first.parsed
    [result.summary, result.sentiment]
  end
end
