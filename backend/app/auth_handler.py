import os
import json
import jwt
import datetime
from supabase import create_client
from flask import Flask, request, jsonify, redirect, session
from flask_cors import CORS

app = Flask(__name__)
# Add a secret key for sessions (change this to a random secret key in production)
app.secret_key = 'your-secret-key-here-change-in-production'

CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:5500", "http://localhost:5500"])  # Add your frontend domains

# Supabase configuration
SUPABASE_URL = "https://wubuxdvluvpysvffdioe.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YnV4ZHZsdXZweXN2ZmZkaW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzQ3NzgsImV4cCI6MjA3MzQxMDc3OH0.2ylSrohGqLejj7Ldod_XS8JiRtbdcLDpGc7EhcyImSA"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name')
        username = data.get('username')

        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
        })

        if auth_response.user:
            # Create profile in profiles table
            profile_response = supabase.table('profiles').insert({
                "id": auth_response.user.id,
                "full_name": full_name,
                "username": username,
                "email": email
            }).execute()

            # Create default settings for user
            settings_response = supabase.table('settings').insert({
                "user_id": auth_response.user.id
            }).execute()

            return jsonify({
                "success": True,
                "message": "User created successfully",
                "user": {
                    "id": auth_response.user.id,
                    "email": auth_response.user.email
                }
            }), 201

        return jsonify({
            "success": False,
            "message": auth_response.error.message
        }), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        # Sign in user
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        if auth_response.user:
            return jsonify({
                "success": True,
                "message": "Login successful",
                "user": {
                    "id": auth_response.user.id,
                    "email": auth_response.user.email
                },
                "session": auth_response.session.dict() if auth_response.session else None
            }), 200

        return jsonify({
            "success": False,
            "message": auth_response.error.message
        }), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/auth/logout', methods=['POST'])
def logout():
    try:
        supabase.auth.sign_out()
        return jsonify({
            "success": True,
            "message": "Logged out successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/auth/user', methods=['GET'])
def get_user():
    try:
        # This would typically check the session token
        # For simplicity, we're using a basic implementation
        user_id = request.args.get('user_id')
        if user_id:
            user_response = supabase.auth.admin.get_user_by_id(user_id)
            if user_response.user:
                return jsonify({
                    "success": True,
                    "user": user_response.user.dict()
                }), 200
        
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/auth/check-session', methods=['GET'])
def check_session():
    """Check if user has a valid session"""
    try:
        # You can implement JWT token validation here
        user_id = request.args.get('user_id')
        if user_id:
            # Verify user exists
            user_response = supabase.auth.admin.get_user_by_id(user_id)
            if user_response.user:
                return jsonify({
                    "success": True,
                    "user": {
                        "id": user_response.user.id,
                        "email": user_response.user.email
                    }
                }), 200
        
        return jsonify({
            "success": False,
            "message": "No valid session"
        }), 401
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)