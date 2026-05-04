# frozen_string_literal: true

class Search
  include Mongoid::Document
  include Mongoid::Timestamps

  has_many :news

  field :query, type: String
  field :page, type: Integer
  field :articles, type: Array
end
