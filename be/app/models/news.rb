# frozen_string_literal: true

class News
  include Mongoid::Document

  belongs_to :search, optional: true

  field :title, type: String
  field :url, type: String
  field :content, type: String
  field :summary, type: String
  field :image_url, type: String
  field :sentiment, type: String

  validates :title, presence: true
  validates :url, presence: true, format: URI.regexp(["http", "https"])
  validates :content, presence: true
  validates :sentiment, inclusion: { in: ["positive", "negative", "neutral"] }, allow_nil: true

  def serialize
    {
      title: title,
      url: url,
      summary: summary,
      sentiment: sentiment,
      image_url: image_url,
    }
  end
end
