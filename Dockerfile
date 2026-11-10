# Node.js 22 LTS on Alpine, pinned by the digest of the multi-arch image index (amd64, arm64, arm/v7, arm/v6).
# To update: change the tag and its index digest (Docker Hub) together.
ARG NODE_IMAGE=node:22.23.4-alpine3.24@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202

# Build with all dependencies, then prune to the runtime dependencies from the local cache.
# Install scripts are off, and the lockfile must match package.json.
FROM ${NODE_IMAGE} AS build
WORKDIR /smartbed-mqtt
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts
COPY src ./src/
COPY tsconfig.build.json tsconfig.json ./
RUN yarn build:ci && \
    yarn install --frozen-lockfile --ignore-scripts --production --offline

FROM ${NODE_IMAGE}

ENV LANG=C.UTF-8

# bashio reads the add-on options and the MQTT service from the Supervisor. The archive is checked against its SHA-256.
ARG BASHIO_VERSION=0.13.1
ARG BASHIO_SHA256=bcc39ca88cfb7d8dc3657fbf696365d366093cb2918df27919ff39965ef9e554
RUN apk add --no-cache bash curl jq && \
    curl -fsSL -o /tmp/bashio.tar.gz "https://github.com/hassio-addons/bashio/archive/v${BASHIO_VERSION}.tar.gz" && \
    echo "${BASHIO_SHA256}  /tmp/bashio.tar.gz" | sha256sum -c - && \
    mkdir /usr/lib/bashio && \
    tar zxf /tmp/bashio.tar.gz --strip 2 -C /usr/lib/bashio "bashio-${BASHIO_VERSION}/lib" && \
    ln -s /usr/lib/bashio/bashio /usr/bin/bashio && \
    rm /tmp/bashio.tar.gz

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

WORKDIR /smartbed-mqtt
COPY run.sh /smartbed-mqtt/
RUN chmod a+x run.sh

COPY --from=build /smartbed-mqtt/node_modules /smartbed-mqtt/node_modules
COPY --from=build /smartbed-mqtt/dist/tsc/ /smartbed-mqtt/

ENTRYPOINT [ "/smartbed-mqtt/run.sh" ]
LABEL \
    io.hass.name="Smartbed Integration via MQTT" \
    io.hass.description="Home Assistant Community Add-on for Smartbeds" \
    io.hass.type="addon" \
    io.hass.version="1.1.22-2" \
    maintainer="Richard Hopton <richard@thehoptons.com>"
