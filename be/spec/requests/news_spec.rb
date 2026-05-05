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

  describe "GET /news/:id/events" do
    context "when news is already enriched" do
      let!(:news) { create(:news) }

      it "streams the current news immediately and sets SSE headers" do
        get "/news/#{news.id}/events"

        expect(response.headers["Content-Type"]).to(eq("text/event-stream"))
        data = JSON.parse(response.body.split("\n\n").first.split(": ", 2).last)
        expect(data["id"]).to(eq(news.id.to_s))
        expect(data["summary"]).to(eq(news.summary))
      end
    end

    context "when news is pending enrichment" do
      let!(:news) { create(:news, summary: nil, sentiment: nil) }

      before do
        allow_any_instance_of(NewsController).to(receive(:change_stream_for).and_return([{}].each))
        allow_any_instance_of(News).to(receive(:reload)) do |instance|
          instance.summary = "Enriched summary"
          instance.sentiment = "positive"
          instance
        end
      end

      it "streams the news once a MongoDB change is received" do
        get "/news/#{news.id}/events"

        expect(response.headers["Content-Type"]).to(eq("text/event-stream"))
        data = JSON.parse(response.body.split("\n\n").first.split(": ", 2).last)
        expect(data).to(include("summary" => "Enriched summary", "sentiment" => "positive"))
      end
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
