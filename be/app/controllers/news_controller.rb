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
        Rails.logger.info("News updated: #{news.id} summary: #{news.summary.present?}")
        response.stream.write("data: #{news.serialize.to_json}\n\n")
        break
      end
    rescue ActionController::Live::ClientDisconnected, IOError
      # client disconnected
    ensure
      response.stream.close
    end
  end

  POLL_INTERVAL = 0.5
  POLL_TIMEOUT  = 30

  private def change_stream_for(news)
    # TODO: replace with a pub/sub or DB trigger, e.g.
    # 
    # pipeline = [{ "$match" => { "documentKey._id" => news.id } }]
    # News.collection.watch(pipeline, full_document: "updateLookup")
    # 
    # The above example doesn't work with a simplistic local setup.
    # Mongo complains it needs a replica set.
    
    iterations = (POLL_TIMEOUT / POLL_INTERVAL).to_i
    Enumerator.new do |y|
      iterations.times do
        sleep(POLL_INTERVAL)
        news.reload
        if news.summary.present?
          y << {}
          break
        end
      end
    end
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
