import os
from groq import Groq

def list_groq_models():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("Error: GROQ_API_KEY environment variable is not set.")
        return

    client = Groq(api_key=api_key)
    
    print("Fetching available models from Groq...\n")
    try:
        models = client.models.list()
        print(f"{'Model ID':<40} | {'Owned By':<20}")
        print("-" * 65)
        for model in models.data:
            print(f"{model.id:<40} | {model.owned_by:<20}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    list_groq_models()