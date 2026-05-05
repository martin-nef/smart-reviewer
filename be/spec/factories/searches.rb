# frozen_string_literal: true

FactoryBot.define do
  factory :search do
    query { "test query" }
    page { 1 }
  end
end
