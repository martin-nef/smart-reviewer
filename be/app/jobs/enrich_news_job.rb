# frozen_string_literal: true

class EnrichNewsJob < ApplicationJob
  queue_as :default

  def perform(news_id)
    news = News.find(news_id)
    summary, sentiment = summarise(news)
    news.update!(summary: summary, sentiment: sentiment)
  end

  def summarise(news)
    # OPEN AI API - ask to summarise news.content and output in format
    # {summary: "summary of the news", sentiment: "positive" | "negative" | "neutral"}
    # ask to keep summary concise, under 100 words. Keep it plain text, no markdown or html tags.
    ["TODO: summary of the news", "neutral"]
  end
end
