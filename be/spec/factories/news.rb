# frozen_string_literal: true

FactoryBot.define do
  factory :news do
    title { "Test Article Title" }
    sequence(:url) { |n| "https://example.com/article-#{n}" }
    content { "Some article content here." }
    summary { "A brief summary." }
    image_url { "https://example.com/image.jpg" }
    sentiment { "neutral" }
  end
end
