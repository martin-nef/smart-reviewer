# frozen_string_literal: true

class NewsController < ApplicationController
  include ActionController::Live

  def events
    news = News.find(params[:id])

    response.headers["Content-Type"] = "text/event-stream"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"

    begin
      if news.summary.present?
        response.stream.write("data: #{news.serialize.to_json}\n\n")
        return
      end

      change_stream_for(news).each do |_change|
        news.reload
        response.stream.write("data: #{news.serialize.to_json}\n\n")
        break
      end
    rescue ActionController::Live::ClientDisconnected, IOError
      # client disconnected
    ensure
      response.stream.close
    end
  end

  private def change_stream_for(news)
    pipeline = [{ "$match" => { "documentKey._id" => news.id } }]
    News.collection.watch(pipeline, full_document: "updateLookup")
  end

  def summarise
    news = News.find(params[:id])
    EnrichNewsJob.perform_later(news.id)
    render(json: { status: "ok" })
  end

  def show
    news = News.find(params[:id])
    render(json: news.serialize)
  end
end
