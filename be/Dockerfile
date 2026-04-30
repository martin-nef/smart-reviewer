ARG RUBY_VERSION=3.4.8
FROM ruby:${RUBY_VERSION}-slim AS base

WORKDIR /rails

ENV RAILS_ENV=production \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT=development:test \
    LANG=C.UTF-8

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends curl libjemalloc2 libyaml-0-2 \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends build-essential git pkg-config libyaml-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock ./
RUN bundle install \
    && rm -rf "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

COPY . .

RUN SECRET_KEY_BASE_DUMMY=1 bundle exec bootsnap precompile --gemfile app/ lib/ 2>/dev/null || true

FROM base

COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /rails /rails

RUN groupadd --system --gid 1000 rails \
    && useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash \
    && chown -R rails:rails /rails
USER rails:rails

EXPOSE 3000
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]
