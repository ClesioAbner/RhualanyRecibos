# Sistema de Gestão de Recibos — Colégio Rhulany

Aplicação web desenvolvida para facilitar a emissão, visualização, armazenamento e impressão de recibos escolares pela secretaria. O sistema é simples, rápido, intuitivo e totalmente responsivo, funcionando bem em computadores e tablets.

---

## Sobre o Projecto

O sistema permite ao pessoal da secretaria gerar recibos profissionais para alunos da 1ª à 6ª classe. Cada recibo recebe automaticamente um número sequencial único, inclui a data actual e está formatado para impressão em A4 — com dois recibos por página (parte superior e inferior), prontos para serem cortados ao meio após a impressão.

---

## Funcionalidades

- Geração automática de número de recibo sequencial (sem repetição)
- Data automática
- Suporte para alunos da 1ª à 6ª classe
- Valor pago por extenso em Meticais gerado automaticamente
- Múltiplas formas de pagamento
- Layout profissional para impressão em A4 (2 recibos por página)
- Totalmente responsivo para computador e tablet
- Interface rápida e intuitiva para uso na secretaria

---

## Campos do Recibo

| Campo | Detalhes |
|---|---|
| Nome do Aluno | Obrigatório |
| Classe | 1ª à 6ª classe |
| Número do Aluno | Opcional |
| Nome do Encarregado | Opcional |
| Descrição do Pagamento | Propina, Matrícula, Uniforme, Material Escolar ou Outro |
| Valor Pago | Valor numérico |
| Valor por Extenso | Gerado automaticamente em Meticais |


---

## Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript |
| Design | Tailwind CSS |
| Backend | Node.js |
| Base de Dados | PostgreSQL (Neon) |
| Gestão de Pacotes | npm |

---

## Como Executar o Projecto

### Requisitos

Certifica-te de que tens instalado:

- Node.js (versão 18 ou superior recomendada)
- npm

### Instalação

Clona o repositório:

```bash
git clone https://github.com/ClesioAbner/rhulany-receipts.git
cd rhulany-receipts
```

Instala as dependências:

```bash
npm install
```

### Variáveis de Ambiente

Cria um ficheiro `.env` na raiz do projecto e adiciona a tua string de ligação à base de dados:

```env
DATABASE_URL=a_tua_string_de_ligacao_neon_postgresql
```

### Executar em Desenvolvimento

```bash
npm run dev
```

### Gerar Build para Produção

```bash
npm run build
```

### Executar em Produção

```bash
npm start
```


## Layout de Impressão

Cada página impressa contém dois recibos empilhados verticalmente. Após imprimir em papel A4, basta cortar a página ao meio para obter dois recibos individuais — um para o colégio e outro para o aluno ou encarregado.

---

## Autor

Eclesio Abner Pembelane

## Licença

Este projecto é de uso académico e institucional no Colégio Rhulany.
