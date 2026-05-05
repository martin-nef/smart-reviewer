# frozen_string_literal: true

module Actions
  class SearchNews
    UpstreamError = Class.new(StandardError)
    RateLimitError = Class.new(UpstreamError)

    def initialize(search)
      @search = search
    end

    def call
      return @search.news if @search.news.any?

      response = nil
      response = Net::HTTP.get_response(query_url)
      case response.code
      when "429" then raise RateLimitError
      when /^[45]/ then raise UpstreamError
      end
      articles = parse_articles(response.body)
      persist_articles(articles)
    rescue StandardError => e
      Rails.logger.error("GNews API #{e.class} #{response&.code} #{response&.message}: #{response&.body.try("errors")}")
      raise
    end

    def query_url
      URI::HTTPS.build(
        host: "gnews.io",
        path: "/api/v4/search",
        query: URI.encode_www_form(
          q: @search.query,
          page: @search.page,
          lang: "en",
          apikey: ENV["GNEWS_API_KEY"],
        ),
      )
    end

    def parse_articles(response)
      JSON.parse(response)["articles"] || []
    end

    def persist_articles(articles)
      news_attrs = articles.map do |article|
        {
          title: article["title"],
          url: article["url"],
          content: article["content"],
          summary: article["description"] || "",
          image_url: article["image"] || "",
          sentiment: "neutral",
          search: @search,
        }
      end
      News.create!(news_attrs)
    end
  end
end
