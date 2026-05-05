# frozen_string_literal: true

RSpec.describe("NewsController", type: :request) do
  describe "POST /news" do
    let!(:news) { create(:news) }

    before { allow(EnrichNewsJob).to(receive(:perform_later)) }

    it "enqueues EnrichNewsJob and returns ok status" do
      post "/news/#{news.id}/summarise"

      expect(response).to(have_http_status(:ok))
      expect(JSON.parse(response.body)).to(eq("status" => "ok"))
      expect(EnrichNewsJob).to(have_received(:perform_later).with(news.id))
    end
  end

  describe "GET /news/:id" do
    let(:news) { create(:news) }

    it "returns the serialized news article" do
      get "/news/#{news.id}"

      expect(response).to(have_http_status(:ok))
      json = JSON.parse(response.body)
      expect(json).to(eq(
        "id" => news.id.to_s,
        "title" => news.title,
        "url" => news.url,
        "summary" => news.summary,
        "sentiment" => news.sentiment,
        "image_url" => news.image_url,
      ))
    end
  end
end
