import os
import requests

def analyze_code(file_content):
    url = "http://localhost:11434/api/generate"
    headers = {
        "Content-Type": "application/json"
    }

    prompt_functionality = f"Describe what the following React Native file does in one line:\n\n{file_content}"
    prompt_bugs = f"Identify any bugs or faults in the following React Native code in one line and only one line:\n\n{file_content}"

    data_functionality = {
        "model": "llama3",
        "prompt": prompt_functionality,
        "stream": False
    }
    data_bugs = {
        "model": "llama3",
        "prompt": prompt_bugs,
        "stream": False
    }

    response_functionality = requests.post(url, headers=headers, json=data_functionality)
    response_functionality.raise_for_status()
    functionality_desc = response_functionality.json()['response'].strip()

    response_bugs = requests.post(url, headers=headers, json=data_bugs)
    response_bugs.raise_for_status()
    bugs_desc = response_bugs.json()['response'].strip()

    return functionality_desc, bugs_desc

def process_js_files(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.js'):
                file_path = os.path.join(root, file)
                with open(file_path, 'r') as infile:
                    js_content = infile.read()

                functionality_desc, bugs_desc = analyze_code(js_content)

                new_content = f"/* [AI Doc Review] {functionality_desc} */\n/* [AI Bug Review] {bugs_desc}*/\n {js_content}"

                with open(file_path, 'w') as outfile:
                    outfile.write(new_content)

if __name__ == '__main__':
    directory = 'components' 
    process_js_files(directory)
    print(f"All .js files have been analyzed and updated with comments.")
