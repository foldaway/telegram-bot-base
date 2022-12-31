# telegram-bot-base

[![Deploy](https://github.com/fourthclasshonours/telegram-bot-base/actions/workflows/deploy.yml/badge.svg)](https://github.com/fourthclasshonours/telegram-bot-base/actions/workflows/deploy.yml)

Base repository to create a Telegram bot. This is set up primarily for development to AWS Lambda, and uses AWS DynamoDB for persistence.

There is no local development mode, and this command can be used to deploy locally to production:
```shell
yarn clean && yarn build && sam build && sam deploy
```

### Setting webhook for production
```shell
yarn set-webhook <AWS Lambda Function URL>
```
