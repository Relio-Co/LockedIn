import os
import requests

def generate_documentation(file_content):
    url = "http://localhost:11434/api/generate"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama3",
        "prompt": f"Generate bullet form documentation for the following JavaScript code like this. Just tell me about the Variables and functions, you dont have to tell me what they do. Just use bullet points. \n\n{file_content}",
        "stream": False
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()['response']

def collect_js_files_and_generate_docs(directory, output_file):
    with open(output_file, 'w') as outfile:
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith('.js'):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r') as infile:
                        js_content = infile.read()
                        doc = generate_documentation(js_content)
                        outfile.write(f'// Documentation for {file_path}\n')
                        outfile.write(doc)
                        outfile.write('\n\n')

if __name__ == '__main__':
    directory = 'components'
    output_file = 'generated_documentation.txt'
    collect_js_files_and_generate_docs(directory, output_file)
    print(f"Documentation for all .js files has been generated and saved to {output_file}")
