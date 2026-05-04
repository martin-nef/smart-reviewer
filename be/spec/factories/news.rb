# frozen_string_literal: true

FactoryBot.define do
  factory :news do
    association :search
    title { "Test Article Title" }
    url { "https://example.com/article" }
    content { "Some article content here." }
    summary { "A brief summary." }
    image_url { "https://example.com/image.jpg" }
    sentiment { "neutral" }
  end
end
