# frozen_string_literal: true

class SearchNewsController < ApplicationController
  def get
    @query = params[:query]
    @page = params[:page] || 1
    @news = SearchNews.new(@query, @page).call
  end
end
