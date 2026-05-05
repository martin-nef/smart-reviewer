# frozen_string_literal: true

RSpec.describe(Search) do
  describe "fields" do
    subject(:search) { build(:search) }

    it "exposes all expected attributes" do
      expect(search.query).to(be_a(String))
      expect(search.page).to(be_an(Integer))
    end
  end

  describe "associations" do
    it "has many news" do
      search = create(:search)
      news = create(:news, search: search)

      expect(search.news).to(include(news))
    end
  end
end
