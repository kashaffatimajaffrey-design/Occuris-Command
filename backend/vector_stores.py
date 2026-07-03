import os
from pinecone import Pinecone
import chromadb
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.embeddings.gemini import GeminiEmbedding

class VectorStoreManager:
    def __init__(self):
        # ChromaDB
        self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
        self.chroma_collection = self.chroma_client.get_or_create_collection("risk_collection")
        
        # Pinecone (3072 dimension)
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.pinecone_index = pc.Index(os.getenv("PINECONE_INDEX"))

    def get_chroma_index(self):
        vector_store = ChromaVectorStore(chroma_collection=self.chroma_collection)
        embed_model = GeminiEmbedding(
            model_name="models/gemini-embedding-001",
            api_key=os.getenv("GEMINI_API_KEY")
        )
        return VectorStoreIndex.from_vector_store(vector_store, embed_model=embed_model)

    def get_pinecone_index(self):
        vector_store = PineconeVectorStore(pinecone_index=self.pinecone_index)
        embed_model = GeminiEmbedding(
            model_name="models/gemini-embedding-001",
            api_key=os.getenv("GEMINI_API_KEY")
        )
        return VectorStoreIndex.from_vector_store(vector_store, embed_model=embed_model)

vector_manager = VectorStoreManager()