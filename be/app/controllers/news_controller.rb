# frozen_string_literal: true

class NewsController < ApplicationController
  def summarise
    news = News.find(params[:news_id])
    EnrichNewsJob.perform_later(news.id)
    render(json: { status: "ok" })
  end

  def show
    news = News.find(params[:id])
    render(json: news.serialize)
  end
end
