# frozen_string_literal: true

module Actions
  class SearchNews
    def initialize(search, page)
      @search = search
      @page = page || 1
    end

    def call
      response = Net::HTTP.get(query_url)
      articles = parse_articles(response)
      news = persist_articles(articles)
      news
    end

    def query_url
      page = @page.to_i
      page = 1 if page <= 0

      URI::HTTPS.build(
        host: "gnews.io",
        path: "/api/v4/search",
        query: URI.encode_www_form(
          q: @search.query,
          page: page,
          apiKey: ENV["GNEWS_API_KEY"],
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
