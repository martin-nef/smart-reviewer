# frozen_string_literal: true

module Actions
  class SearchNews
    UpstreamError = Class.new(StandardError)
    RateLimitError = Class.new(UpstreamError)
    DUPLICATE_KEY_CODE = 11_000

    def initialize(search)
      @search = search
    end

    def call
      return @search.news if @search.fetched_at&.today?

      response = nil
      response = Net::HTTP.get_response(query_url)
      case response.code
      when "429" then raise RateLimitError
      when /^[45]/ then raise UpstreamError
      end
      articles = parse_articles(response.body)
      persist_articles(articles)
    rescue StandardError => e
      Rails.logger.error(
        "GNews API error: #{e.class} (#{e.message}) " \
          "status=#{response&.code} #{response&.message} " \
          "query=#{@search.query.inspect} page=#{@search.page} " \
          "body=#{response&.body}",
      )
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
      news = articles.map { |article| find_or_create_news(article) }
      @search.update!(news: news, fetched_at: Time.current)
      @search.news
    end

    private def find_or_create_news(article)
      News.find_or_create_by!(url: article["url"]) do |n|
        n.title = article["title"]
        n.content = article["content"]
        n.image_url = article["image"] || ""
      end
    rescue Mongo::Error::OperationFailure => e
      # A concurrent request inserted the same url between our find and create.
      raise unless e.code == DUPLICATE_KEY_CODE

      News.find_by!(url: article["url"])
    end
  end
end
