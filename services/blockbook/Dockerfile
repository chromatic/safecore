FROM golang:1.21-bookworm AS builder

ARG PORTABLE_ROCKSDB
ARG ROCKSDB_VERSION=v7.7.2
ARG BUILD_JOBS=2
ARG TCMALLOC

RUN apt-get update && apt-get install -y \
    build-essential git wget pkg-config libzmq3-dev \
    libgflags-dev libsnappy-dev zlib1g-dev libbz2-dev \
    libzstd-dev liblz4-dev \
    && rm -rf /var/lib/apt/lists/*

RUN if [ -n "${TCMALLOC}" ]; then \
    apt-get update && apt-get install -y google-perftools && \
    ln -s /usr/lib/libtcmalloc.so.4 /usr/lib/libtcmalloc.so && \
    rm -rf /var/lib/apt/lists/*; \
fi

# Build RocksDB
RUN cd /opt && git clone -b $ROCKSDB_VERSION --depth 1 https://github.com/facebook/rocksdb.git && \
    cd /opt/rocksdb && \
    CFLAGS=-fPIC CXXFLAGS=-fPIC PORTABLE=$PORTABLE_ROCKSDB make -j${BUILD_JOBS} release && \
    strip ldb sst_dump && \
    mkdir -p /build/rocksdb/bin && cp ldb sst_dump /build/rocksdb/bin/

# Build blockbook
ENV GOPATH=/go
ENV CGO_CFLAGS="-I/opt/rocksdb/include"
ENV CGO_LDFLAGS="-L/opt/rocksdb -ldl -lrocksdb -lstdc++ -lm -lz -lbz2 -lsnappy -llz4 -lzstd"
WORKDIR $GOPATH/src/blockbook
COPY . .
RUN go mod download && \
    BUILDTIME=$(date --iso-8601=seconds) && \
    GITCOMMIT=$(git describe --always --dirty 2>/dev/null || echo "local") && \
    LDFLAGS="-X blockbook/common.gitcommit=${GITCOMMIT} -X blockbook/common.buildtime=${BUILDTIME}" && \
    go build -ldflags="-s -w ${LDFLAGS}" -o /build/blockbook .

# --- Stage 2: Runtime image ---
FROM debian:bookworm-slim

ENV GOPATH=/go
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsnappy1v5 libbz2-1.0 libzstd1 liblz4-1 libzmq5 libgflags2.2 \
    && rm -rf /var/lib/apt/lists/*

# Copy RocksDB binaries
COPY --from=builder /build/rocksdb/bin /usr/local/bin
ENV LD_LIBRARY_PATH=/opt/rocksdb/lib

# Copy blockbook binary
COPY --from=builder /build/blockbook /usr/local/bin/blockbook

# Copy full blockbook source tree
COPY --from=builder $GOPATH/src/blockbook /blockbook

# Copy config files
COPY cfg-mainnet.json /
COPY cfg-testnet.json /

WORKDIR /blockbook

EXPOSE 9030 9130 9031 9131

ENTRYPOINT ["/usr/local/bin/blockbook"]
