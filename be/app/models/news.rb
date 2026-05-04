# frozen_string_literal: true

class News
  include Mongoid::Document

  belongs_to :search

  field :title, type: String, validates: { presence: true }
  field :url, type: String, validates: { presence: true, format: URI.regexp(["http", "https"]) }
  field :content, type: String, validates: { presence: true }
  field :summary, type: String
  field :image_url, type: String
  field :sentiment, type: String, validates: { inclusion: { in: ["positive", "negative", "neutral"] } }
end
