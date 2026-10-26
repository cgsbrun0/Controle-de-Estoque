CREATE TABLE `movimentos` (
	`id` text PRIMARY KEY NOT NULL,
	`dono` text NOT NULL,
	`equipamento_id` text NOT NULL,
	`nome` text NOT NULL,
	`codigo` text,
	`tipo` text NOT NULL,
	`quantidade` real NOT NULL,
	`saldo_antes` real NOT NULL,
	`saldo_depois` real NOT NULL,
	`observacao` text,
	`criado_em` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `codigo` text;--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `tipo` text;--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `minimo` real;--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `inicial` real;--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `entradas` real;--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `saidas` real;--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `origem` text;--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `versao` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `excluido_em` text;