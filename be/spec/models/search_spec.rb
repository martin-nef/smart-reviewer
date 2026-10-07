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
      news = create(:news)
      search.news << news

      expect(search.news).to(include(news))
    end

    it "lets several searches share the same news" do
      news = create(:news)
      a = create(:search, query: "ruby")
      b = create(:search, query: "rails")
      a.news << news
      b.news << news

      expect(a.reload.news).to(include(news))
      expect(b.reload.news).to(include(news))
    end
  end
end
