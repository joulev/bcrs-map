FROM oven/bun:1.3.14
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN bun install
CMD bun start
