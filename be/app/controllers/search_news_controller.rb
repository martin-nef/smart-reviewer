# frozen_string_literal: true

class SearchNewsController < ApplicationController
  def get
    query = params[:query]
    page = params[:page] || 1

    search = Search.find_or_create_by(query:, page:)
    news = Actions::SearchNews.new(search, page).call
    render(json: serialize_news(news))
  end

  private def serialize_news(news)
    news.map(&:serialize)
  end
end
