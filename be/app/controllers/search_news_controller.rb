# frozen_string_literal: true

class SearchNewsController < ApplicationController
  def get
    @query = params[:query]
    @page = params[:page] || 1
    @news = Actions::SearchNews.new(@query, @page).call
    render(json: serialize_news(@news))
  end

  private def serialize_news(news)
    news.map(&:serialize)
  end
end
