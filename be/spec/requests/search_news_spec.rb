# frozen_string_literal: true

RSpec.describe("GET /search_news", type: :request) do
  let(:news_list) { build_list(:news, 2) }

  before do
    action_double = instance_double(Actions::SearchNews, call: news_list)
    allow(Actions::SearchNews).to(receive(:new).and_return(action_double))
  end

  it "returns serialized news articles" do
    get "/search_news", params: { query: "ruby", page: 1 }

    expect(response).to(have_http_status(:ok))
    json = JSON.parse(response.body)
    expect(json.length).to(eq(2))
    expect(json.first.keys).to(match_array(["id", "title", "url", "summary", "sentiment", "image_url"]))
  end

  it "passes a Search with the correct query and page to the action" do
    get "/search_news", params: { query: "ruby", page: 2 }

    expect(Actions::SearchNews).to(have_received(:new).with(have_attributes(query: "ruby", page: 2)))
  end

  it "normalises page to 1 for zero or negative values" do
    get "/search_news", params: { query: "ruby", page: 0 }

    expect(Actions::SearchNews).to(have_received(:new).with(have_attributes(page: 1)))
  end

  context "when GNews is rate limiting" do
    before do
      action_double = instance_double(Actions::SearchNews)
      allow(action_double).to(receive(:call).and_raise(Actions::SearchNews::RateLimitError))
      allow(Actions::SearchNews).to(receive(:new).and_return(action_double))
    end

    it "returns 429" do
      get "/search_news", params: { query: "ruby" }

      expect(response).to(have_http_status(:too_many_requests))
      expect(JSON.parse(response.body)).to(eq("error" => "rate limited"))
    end
  end

  context "when GNews returns an upstream error" do
    before do
      action_double = instance_double(Actions::SearchNews)
      allow(action_double).to(receive(:call).and_raise(Actions::SearchNews::UpstreamError))
      allow(Actions::SearchNews).to(receive(:new).and_return(action_double))
    end

    it "returns 503" do
      get "/search_news", params: { query: "ruby" }

      expect(response).to(have_http_status(:service_unavailable))
      expect(JSON.parse(response.body)).to(eq("error" => "upstream error"))
    end
  end
end
