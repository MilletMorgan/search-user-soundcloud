#!/bin/bash

clientID="s8dyU0RAv8luJU3572ipEF5nr0aakzLc"
resultLimit=10
listUsersFile="listUsers.txt"
totalUsers=0
usernameAvailable=()
usernameAlreadyUsed=()
usernameUnpopular=()

while IFS= read -r username; do
    encoded_username=$(echo "$username" | jq -s -R -r @uri)

    query="https://api-v2.soundcloud.com/search/users?q=${encoded_username}&client_id=${clientID}&limit=${resultLimit}&app_locale=fr"

    response=$(curl -s "$query")

    total_results=$(printf "%s\n" "$response" | jq -r '.total_results')
    userFromCollection=$(printf "%s\n" "$response" | jq -r '.collection[0].username')
    followersCount=$(printf "%s\n" "$response" | jq -r '.collection[0].followers_count')

    if [ "$userFromCollection" == "$username" ]; then
        usernameAlreadyUsed+=("$username ($followersCount followers)")
    fi

    if [ "$total_results" -ne 0 ]; then
        if [ "$followersCount" -lt 100 ]; then
            usernameUnpopular+=("$username ($followersCount followers)")
        fi
    fi

    echo "Résultat pour la recherche de l'utilisateur '$username' : "

    printf "%s\n" "$response" | jq '{users: [.collection[] | {username, followers_count}] | sort_by(-.followers_count), total_users_with_similar_name: .total_results}'

    if [ "$total_results" -eq 0 ]; then
        usernameAvailable+=("$username")
    fi

    echo "-----------------------------------------------------------------"

    totalUsers=$((totalUsers + 1))
done <"$listUsersFile"

echo "Nombre total d'utilisateurs rechercher : $totalUsers\n\n"

if [ ${#usernameAvailable[@]} -gt 0 ]; then
    echo "\n\nListe des nom d'utilisateurs n'existant pas sur SoundCloud (${#usernameAvailable[@]} utilisateurs) :\n"
    printf " - %s\n" "${usernameAvailable[@]}"
fi

if [ ${#usernameAlreadyUsed[@]} -gt 0 ]; then
    echo "\n\nListe des nom d'utilisateurs déjà utilisés sur SoundCloud (${#usernameAlreadyUsed[@]} utilisateurs) :\n"
    printf " - %s\n" "${usernameAlreadyUsed[@]}"
fi

if [ ${#usernameUnpopular[@]} -gt 0 ]; then
    echo "\n\nListe des nom d'utilisateurs peu populaires sur SoundCloud (${#usernameUnpopular[@]} utilisateurs) :\n"
    printf " - %s\n" "${usernameUnpopular[@]}"
fi
