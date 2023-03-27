#!/usr/bin/env zx

import fetch from "node-fetch";
import { readFile } from "fs/promises";

const clientID = "s8dyU0RAv8luJU3572ipEF5nr0aakzLc";
const resultLimit = 10;
const listUsersFile = "listUsers.txt";

const getResults = async (username) => {
	const encoded_username = encodeURIComponent(username);
	const query = `https://api-v2.soundcloud.com/search/users?q=${encoded_username}&client_id=${clientID}&limit=${resultLimit}&app_locale=fr`;
	const response = await fetch(query);
	const data = await response.json();
	return data;
};

const isUsernameAvailable = async (username) => {
	const data = await getResults(username);
	return data.total_results === 0;
};

const printTable = (rows, columns, spacing = 4) => {
	const sortedRows = rows.sort((a, b) => b.followers_count - a.followers_count);
	console.table(
		sortedRows.map((row) =>
			columns.reduce(
				(obj, column) => ({
					...obj,
					[column]: row[column],
				}),
				{},
			),
		),
		["username_search", "similar_username", "followers_count", "permalink_url"],
	);
};

(async () => {
	const userList = await readFile(listUsersFile, "utf-8");
	const usernames = userList.trim().split("\n");

	const results = await Promise.all(
		usernames.map(async (username) => {
			const available = await isUsernameAvailable(username);
			if (available) {
				return { username, available, existing: false, unpopular: false };
			}
			const data = await getResults(username);
			const unpopular =
				data.collection.length > 0 && data.collection[0].followers_count < 100;

			return {
				username_search: username,
				similar_username: data.collection[0].username,
				available: false,
				existing: true,
				unpopular,
				followers_count: data.collection[0].followers_count,
				permalink_url: data.collection[0].permalink_url,
			};
		}),
	);

	const availableUsernames = results.filter((result) => result.available);
	console.log(
		`Liste des noms d'utilisateur disponibles (${availableUsernames.length}):`,
	);
	console.log(
		availableUsernames.map((result) => `- ${result.username}`).join("\n"),
	);

	const existingUnpopularUsernames = results.filter(
		(result) => result.existing && result.unpopular,
	);
	console.log(
		`\nListe des noms d'utilisateur déjà utilisés mais peu populaires (${existingUnpopularUsernames.length}):`,
	);
	printTable(existingUnpopularUsernames, [
		"username_search",
		"similar_username",
		"followers_count",
		"permalink_url",
	]);

	console.log(" ".repeat(4));

	const existingPopularUsernames = results.filter(
		(result) => result.existing && !result.unpopular,
	);

	console.log(
		`Liste des noms d'utilisateur déjà utilisés et populaires (${existingPopularUsernames.length}):`,
	);
	printTable(existingPopularUsernames, [
		"username_search",
		"similar_username",
		"followers_count",
		"permalink_url",
	]);
})();
