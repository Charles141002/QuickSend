from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import stripe

from ..database import get_db
from ..config import get_settings
from ..models.user import User
from .auth import get_current_user

router = APIRouter()
settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY

# Créer un router sans vérification CSRF pour le webhook
webhook_router = APIRouter(include_in_schema=False)

@router.post("/create-payment-intent")
async def create_payment_intent(
    amount: int,
    current_user: User = Depends(get_current_user)
):
    """Crée une intention de paiement Stripe"""
    try:
        # Vérifier le montant minimum
        if amount < 200:  # 2€ minimum
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Montant minimum: 2€"
            )

        # Calculer les crédits
        credits = calculate_credits(amount)

        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="eur",
            metadata={
                "user_id": current_user.id,
                "credits": credits
            },
            automatic_payment_methods={
                "enabled": True,
                "allow_redirects": "always"
            },
            # Optionnel : Ajouter une description
            description=f"Achat de {credits} crédits"
        )

        return {
            "clientSecret": payment_intent.client_secret,
            "credits": credits,
            "amount": amount
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@webhook_router.post("/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Webhook Stripe pour confirmer les paiements"""
    print("🔵 Début du traitement webhook")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    print(f"🔵 Signature reçue: {sig_header[:30]}...")

    try:
        event = stripe.Webhook.construct_event(
            payload, 
            sig_header, 
            settings.STRIPE_WEBHOOK_SECRET,
            tolerance=None
        )
        print(f"🟢 Webhook validé ! Type: {event.type}")

        # Gérer différents types d'événements
        if event.type == "payment_intent.created":
            print("🟡 Intention de paiement créée, en attente du paiement...")
            
        elif event.type == "payment_intent.processing":
            print("🟡 Paiement en cours de traitement...")
            
        elif event.type == "payment_intent.succeeded":
            payment_intent = event.data.object
            user_id = payment_intent.metadata.get("user_id")
            credits = int(payment_intent.metadata.get("credits", 0))

            print(f"🟢 PAIEMENT RÉUSSI!")
            print(f"🟢 Payment Intent ID: {payment_intent.id}")
            print(f"🟢 Metadata: {payment_intent.metadata}")
            print(f"🟢 Montant: {payment_intent.amount/100}€")
            print(f"🟢 Status: {payment_intent.status}")

            try:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    ancien_solde = user.credits
                    user.credits += credits
                    db.commit()
                    print(f"💰 Crédits mis à jour: {ancien_solde} -> {user.credits}")
                else:
                    print(f"🔴 ERREUR: Utilisateur {user_id} non trouvé")
            except Exception as db_error:
                print(f"🔴 ERREUR DB: {str(db_error)}")
                db.rollback()
                raise

        elif event.type == "payment_intent.payment_failed":
            payment_intent = event.data.object
            print(f"🔴 Échec du paiement: {payment_intent.id}")
            print(f"🔴 Raison: {payment_intent.last_payment_error}")

        else:
            print(f"ℹ️ Event non traité: {event.type}")

        return {"status": "success"}

    except Exception as e:
        print(f"🔴 ERREUR Webhook: {str(e)}")
        print(f"🔴 Type d'erreur: {type(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

def calculate_credits(amount_cents: int) -> int:
    """Calcule le nombre de crédits en fonction du montant"""
    amount_euros = amount_cents / 100
    if amount_euros >= 10:
        return int(amount_euros * 60)  # 10€ = 600 crédits
    elif amount_euros >= 5:
        return int(amount_euros * 55)  # 5€ = 275 crédits
    else:
        return int(amount_euros * 50)  # 2€ = 100 crédits 