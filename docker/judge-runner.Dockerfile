# Minimal sandbox runner image for compiling and executing C, C++, and Python submissions
FROM alpine:3.20

# Install compilers, Python 3 runtime, and essential standard libraries
RUN apk add --no-cache \
    gcc \
    g++ \
    python3 \
    musl-dev \
    libstdc++

# Create a non-privileged user and group for executing untrusted code
RUN addgroup -g 1001 -S sandboxgroup && \
    adduser -u 1001 -S sandboxuser -G sandboxgroup -s /sbin/nologin

# Create and set permissions for sandbox working directory
WORKDIR /sandbox
RUN chown -R sandboxuser:sandboxgroup /sandbox

# Switch to non-root user
USER sandboxuser

CMD ["/bin/sh"]
