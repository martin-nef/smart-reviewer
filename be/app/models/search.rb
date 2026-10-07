# frozen_string_literal: true

class Search
  include Mongoid::Document
  include Mongoid::Timestamps

  has_and_belongs_to_many :news, inverse_of: nil

  field :query, type: String
  field :page, type: Integer
  field :fetched_at, type: Time
end
