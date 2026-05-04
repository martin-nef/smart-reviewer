# frozen_string_literal: true

module Actions
  class SearchNews
    def initialize(query, page)
      @query = query
      @page = page || 1
    end

    def call
      response = Net::HTTP.get(query_url)
      articles = parse_articles(response)
      news = persist_articles(articles)
      news
    end

    def query_url
      query = URI.encode_uri_component(@query)
      page = begin
        @page.to_i
      rescue StandardError
        1
      end
      page = 1 if page <= 0
      url = "https://gnews.io/api/v4/search?\
           q=#{query}\
           &page=#{page}\
           &apiKey=#{ENV["GNEWS_API_KEY"]}"
      URI(url)
    end

    def parse_articles(response)
      JSON.parse(response.body)["articles"]
    end

    def persist_articles(articles)
      news = articles.map do |article|
        {
          title: article["title"],
          url: article["url"],
          content: article["content"],
          summary: article["description"] || "",
          image_url: article["urlToImage"] || "",
          sentiment: "neutral",
        }
      end
      News.create!(news)
    end
  end
end
