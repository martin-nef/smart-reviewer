# frozen_string_literal: true

class EnrichNewsJob < ApplicationJob
  queue_as :default

  MODEL = "gpt-5-nano"

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
      model: MODEL,
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

    log_usage(response)

    result = response.output.flat_map(&:content).first.parsed
    [result.summary, result.sentiment]
  end

  private def log_usage(response)
    usage = response.usage

    Rails.logger.info(
      "OpenAI call: model=#{response.model} " \
        "input_tokens=#{usage.input_tokens} output_tokens=#{usage.output_tokens} " \
        "total_tokens=#{usage.total_tokens}",
    )
  end
end
