import os

def collect_js_files_content(root_dir, output_file):
    # Open the output file in write mode
    with open(output_file, 'w') as outfile:
        # Walk through the directory
        for subdir, _, files in os.walk(root_dir):
            for file in files:
                # Check if the file has a .js extension
                if file.endswith('.js'):
                    file_path = os.path.join(subdir, file)
                    # Open and read the content of the js file
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        # Write the content to the output file
                        outfile.write(f"// Content from {file_path}\n")
                        outfile.write(content)
                        outfile.write("\n\n")

if __name__ == "__main__":
    # Define the root directory and the output file
    root_directory = '../components/'  # Replace with the path to your JS project directory
    output_file_path = 'all_js_files_content.txt'
    
    # Collect content from JS files and write to the output file
    collect_js_files_content(root_directory, output_file_path)

    print(f"All JS files content have been written to {output_file_path}")
