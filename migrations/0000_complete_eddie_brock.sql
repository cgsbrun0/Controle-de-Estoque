CREATE TABLE `equipamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`dono` text NOT NULL,
	`nome` text NOT NULL,
	`chave` text NOT NULL,
	`quantidade` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipamento_por_dono` ON `equipamentos` (`dono`,`chave`);