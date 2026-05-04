# frozen_string_literal: true

Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check
  get "health" => "health#show"
  root to: ->(_) { [200, { "Content-Type" => "application/json" }, [%({"service":"smart-reviewer-be"})]] }
  get "search_news" => "search_news#get"
  post "news" => "news#summarise"
  get "news/:id" => "news#show"
end
