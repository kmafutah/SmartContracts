# #!/bin/bash

# # Define the folders to search (removed commas)
# FOLDERS=("pmms" "zigt_stablecoin_v5" "ZiGT_github" "ZiGEcocash" "ZiG")

# # Loop through each folder
# for FOLDER in "${FOLDERS[@]}"; do
#     # Define the output filename based on the folder name
#     OUTPUT_FILE="${FOLDER}.txt"

#     # Check if the folder exists
#     if [ -d "$FOLDER" ]; then
#         echo "Processing folder: $FOLDER"
#         echo "Outputting to: $OUTPUT_FILE"

#         # Clear the output file if it exists, or create it
#         > "$OUTPUT_FILE"

#         # Find all .sol files in the current folder and its subdirectories
#         # Use -print0 and xargs -0 for handling filenames with spaces or special characters
#         find "$FOLDER" -type f -name "*.sol" -print0 | while IFS= read -r -d $'\0' file; do
#             # Get the full path of the file
#             FULL_PATH="$file"
#             # Get just the filename
#             FILENAME=$(basename "$file")

#             # Append the full path, filename, and then the content of the file
#             echo "---Path and files name: $FULL_PATH" >> "$OUTPUT_FILE"
#             echo "---Filename: $FILENAME" >> "$OUTPUT_FILE"
#             echo "---File Content Start---" >> "$OUTPUT_FILE"
#             cat "$file" >> "$OUTPUT_FILE" # This line now adds the file content
#             echo "---File Content End---" >> "$OUTPUT_FILE"
#             echo "" >> "$OUTPUT_FILE" # Add a blank line for separation between files
#         done
#         echo "Finished processing $FOLDER. Results saved to $OUTPUT_FILE"
#     else
#         echo "Error: Folder '$FOLDER' not found. Skipping."
#     fi
#     echo "" # Add a newline for better readability between folder outputs
# done

# echo "Script finished."
#!/bin/bash

# Define the folders to search
FOLDERS=("pmms" "zigt_stablecoin_v5" "ZiGT_github" "ZiGEcocash" "ZiG")

# Loop through each folder
for FOLDER in "${FOLDERS[@]}"; do
    # Define the output filename based on the folder name
    OUTPUT_FILE="${FOLDER}.txt"

    # Check if the folder exists
    if [ -d "$FOLDER" ]; then
        echo "Processing folder: $FOLDER"
        echo "Outputting to: $OUTPUT_FILE"

        # Clear the output file if it exists, or create it
        > "$OUTPUT_FILE"

        # Find all .sol files in the current folder and its subdirectories,
        # excluding the node_modules folder.
        # -type d -name "node_modules" -prune: finds directories named "node_modules" and prunes them (prevents descending into them).
        # -o: logical OR operator. If the previous condition is met, the next one is not evaluated for that path.
        # -type f -name "*.sol": finds regular files ending with ".sol".
        # -print0: prints filenames separated by a null character, safe for xargs -0 or while read -d $'\0'.
        find "$FOLDER" -type d -name "node_modules" -prune -o -type f -name "*.sol" -print0 | while IFS= read -r -d $'\0' file; do
            # Get the full path of the file
            FULL_PATH="$file"
            # Get just the filename
            FILENAME=$(basename "$file")

            # Append the full path, filename, and then the content of the file
            echo "---Path and files name: $FULL_PATH" >> "$OUTPUT_FILE"
            echo "---Filename: $FILENAME" >> "$OUTPUT_FILE"
            echo "---File Content Start---" >> "$OUTPUT_FILE"
            cat "$file" >> "$OUTPUT_FILE" # This line now adds the file content
            echo "---File Content End---" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE" # Add a blank line for separation between files
        done
        echo "Finished processing $FOLDER. Results saved to $OUTPUT_FILE"
    else
        echo "Error: Folder '$FOLDER' not found. Skipping."
    fi
    echo "" # Add a newline for better readability between folder outputs
done

echo "Script finished."