# cnpj

Serverless application to fetch CNPJ data from [Casa dos Dados](https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada).

## Usage

### `GET`

Get data without any filter.

```sh
curl https://cnpj.rafaelfranco.com
```

### `POST `

Allow filter `body` to be sent with the request. See body format below.

```sh
curl --location --request POST 'https://cnpj.rafaelfranco.com' \
--header 'Content-Type: application/json' \
--data-raw '{
  "page": 2
}'
```

## Default body

A default body is included with the request, and can be changed [here](https://github.com/rfoel/cnpj/blob/main/handlers/utils.ts#L1).

```json
{
  "query": {
    "termo": [],
    "atividade_principal": [],
    "natureza_juridica": [],
    "uf": [],
    "municipio": [],
    "situacao_cadastral": "ATIVA",
    "cep": [],
    "ddd": []
  },
  "range_query": {
    "data_abertura": {
      "lte": null,
      "gte": null
    },
    "capital_social": {
      "lte": null,
      "gte": null
    }
  },
  "extras": {
    "somente_mei": false,
    "excluir_mei": false,
    "com_email": false,
    "incluir_atividade_secundaria": false,
    "com_contato_telefonico": false,
    "somente_fixo": false,
    "somente_celular": false,
    "somente_matriz": false,
    "somente_filial": false
  },
  "page": 1
}
```

> This is the exact body that [Casa dos Dados](https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada) sends in its request, so you can just tweak it for your liking.
