# #!/bin/bash

# # Check if host is provided as a command line argument
# if [ -z "$1" ]; then
#   echo "Usage: $0 <host>"
#   echo "Example: $0 http://localhost:3000"
#   exit 1
# fi
# host=$1

# # Function to cleanly exit
# cleanup() {
#   echo "Terminating background processes..."
#   kill $pid1 $pid2 $pid3 $pid4
#   exit 0
# }

# # Trap SIGINT (Ctrl+C) to execute the cleanup function
# trap cleanup SIGINT

# # Simulate a user requesting the menu every 3 seconds
# while true; do
#   curl -s "$host/api/order/menu" > /dev/null
#   echo "Requesting menu..."
#   sleep 3
# done &
# pid1=$!

# # Simulate a user with an invalid email and password every 25 seconds
# while true; do
#   curl -s -X PUT "$host/api/auth" -d '{"email":"unknown@jwt.com", "password":"bad"}' -H 'Content-Type: application/json' > /dev/null
#   echo "Logging in with invalid credentials..."
#   sleep 25
# done &
# pid2=$!

# # Simulate a franchisee logging in every two minutes
# while true; do
#   response=$(curl -s -X PUT $host/api/auth -d '{"email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json')
#   token=$(echo $response | jq -r '.token')
#   echo "Login franchisee..."
#   sleep 110
#   curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
#   echo "Logging out franchisee..."
#   sleep 10
# done &
# pid3=$!

# # Simulate a diner ordering a pizza every 20 seconds
# while true; do
#   response=$(curl -s -X PUT $host/api/auth -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json')
#   token=$(echo $response | jq -r '.token')
#   echo "Login diner..."
#   curl -s -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H "Authorization: Bearer $token" > /dev/null
#   echo "Bought a pizza..."
#   sleep 20
#   curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
#   echo "Logging out diner..."
#   sleep 30
# done &
# pid4=$!


# # Wait for the background processes to complete
# wait $pid1 $pid2 $pid3 $pid4


#!/bin/bash

# Check if host is provided as a command line argument
if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi
host=$1

# Function to cleanly exit
cleanup() {
  echo "Terminating background processes..."
  kill $pid1 $pid2 $pid3 $pid4
  exit 0
}

# Trap SIGINT (Ctrl+C) to execute the cleanup function
trap cleanup SIGINT

# Populate JWT Pizza data
echo "Populating JWT Pizza data..."

# Login as admin to get the token
response=$(curl -s -X PUT $host/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json')
token=$(echo $response | jq -r '.token')
echo "Admin logged in. Token obtained."

# Add users: diner and franchisee
curl -X POST $host/api/auth -d '{"name":"pizza diner", "email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json'
curl -X POST $host/api/auth -d '{"name":"pizza franchisee", "email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json'

# Add menu items
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Veggie", "description": "A garden of delight", "image":"pizza1.png", "price": 0.0038 }'  -H "Authorization: Bearer $token"
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Pepperoni", "description": "Spicy treat", "image":"pizza2.png", "price": 0.0042 }'  -H "Authorization: Bearer $token"
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Margarita", "description": "Essential classic", "image":"pizza3.png", "price": 0.0042 }'  -H "Authorization: Bearer $token"
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Crusty", "description": "A dry mouthed favorite", "image":"pizza4.png", "price": 0.0028 }'  -H "Authorization: Bearer $token"
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Charred Leopard", "description": "For those with a darker side", "image":"pizza5.png", "price": 0.0099 }'  -H "Authorization: Bearer $token"

# Add franchise and store
curl -X POST $host/api/franchise -H 'Content-Type: application/json' -d '{"name": "pizzaPocket", "admins": [{"email": "f@jwt.com"}]}'  -H "Authorization: Bearer $token"
curl -X POST $host/api/franchise/1/store -H 'Content-Type: application/json' -d '{"franchiseId": 1, "name":"SLC"}'  -H "Authorization: Bearer $token"

echo "Data population completed."

# Simulate traffic

echo "Starting traffic simulation for $host..."

# Simulate a user requesting the menu every 3 seconds
while true; do
  curl -s "$host/api/order/menu" > /dev/null
  echo "Requesting menu..."
  sleep 3
done &
pid1=$!

# Simulate a user with invalid email and password every 25 seconds
while true; do
  curl -s -X PUT "$host/api/auth" -d '{"email":"unknown@jwt.com", "password":"bad"}' -H 'Content-Type: application/json' > /dev/null
  echo "Logging in with invalid credentials..."
  sleep 25
done &
pid2=$!

# Simulate a franchisee logging in every two minutes
while true; do
  response=$(curl -s -X PUT "$host/api/auth" -d '{"email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  sleep 110
  curl -X DELETE "$host/api/auth" -H "Authorization: Bearer $token"
  echo "Login franchisee..."
  sleep 10
done &
pid3=$!

# Simulate a diner ordering a pizza every 20 seconds
while true; do
  response=$(curl -s -X PUT "$host/api/auth" -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  curl -s -X POST "$host/api/order" -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}' -H "Authorization: Bearer $token" > /dev/null
  echo "Bought a pizza..."
  sleep 20
  curl -X DELETE "$host/api/auth" -H "Authorization: Bearer $token"
  echo "Logging out diner..."
  sleep 30
done &
pid4=$!

# Wait for the background processes to complete
wait $pid1 $pid2 $pid3 $pid4
