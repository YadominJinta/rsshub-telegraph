# rsshub-telegraph

Tool converts rss with content to telegraph and send to telegram channel.

example channel: [@the_wsj](https://t.me/the_wsj)

## Usage

Run in commandline

```shell
pnpm install
npx ts-node main.ts config.json
```

Run in docker

```shell
docker pull yadomin/rsshub-telegraph
docker run -d --restart always \
  -v $PWD/config.json:/app/config.json \
  -v $PWD/lastUpdate.json:/app/lastUpdate.json \
  yadomin/rsshub-telegraph
```