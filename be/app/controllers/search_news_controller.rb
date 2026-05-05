# frozen_string_literal: true

class SearchNewsController < ApplicationController
  rescue_from(Actions::SearchNews::UpstreamError) { render(json: { error: "upstream error" }, status: :service_unavailable) }
  rescue_from(Actions::SearchNews::RateLimitError) { render(json: { error: "rate limited" }, status: :too_many_requests) }

  def get
    query = params[:query]
    page = params[:page].to_i
    page = 1 if page <= 0
    search = Search.find_or_create_by(query:, page:)
    news = Actions::SearchNews.new(search).call
    render(json: serialize_news(news))
  end

  private def serialize_news(news)
    news.map(&:serialize)
  end
end
